// apps/api/src/modules/competitions/competitions.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CompetitionsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize S3/MinIO client
    this.s3Client = new S3Client({
      region: this.config.get('S3_REGION') || 'us-east-1',
      endpoint: this.config.get('S3_ENDPOINT'), // For MinIO
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY'),
        secretAccessKey: this.config.get('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucketName = this.config.get('S3_BUCKET_NAME') || 'gymnastics-logos';
  }

  /**
   * Создать новое соревнование
   */
  async create(dto: CreateCompetitionDto) {
    // Создать соревнование с дисциплинами
    const competition = await this.prisma.competition.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days: dto.days,
        city: dto.city,
        venue: dto.venue,
        organizer: dto.organizer,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        category: dto.category,
        tiebreakRule: dto.tiebreakRule || 'SHARE',
        rankingSkip: dto.rankingSkip || 'NO_SKIP',
        dCalculation: dto.dCalculation || 'RUSSIAN',
        disciplines: {
          create: dto.disciplines.map((discipline) => ({ discipline })),
        },
      },
      include: {
        disciplines: true,
      },
    });

    return competition;
  }

  /**
   * Получить список соревнований с фильтрацией
   */
  async findAll(filter?: {
    city?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filter?.city) {
      where.city = { contains: filter.city, mode: 'insensitive' };
    }

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.startDate || filter?.endDate) {
      where.AND = [];
      if (filter.startDate) {
        where.AND.push({ startDate: { gte: filter.startDate } });
      }
      if (filter.endDate) {
        where.AND.push({ endDate: { lte: filter.endDate } });
      }
    }

    return this.prisma.competition.findMany({
      where,
      include: {
        disciplines: true,
        judges: {
          include: {
            judge: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            participants: true,
            scores: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  /**
   * Получить одно соревнование по ID
   */
  async findOne(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        disciplines: true,
        judges: {
          include: {
            judge: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        participants: {
          include: {
            participant: true,
          },
        },
        scores: {
          include: {
            participant: true,
          },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    return competition;
  }

  /**
   * Обновить соревнование
   */
  async update(id: string, dto: UpdateCompetitionDto) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    const updateData: any = { ...dto };

    // Обновить даты если указаны
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }

    // Обновить дисциплины если указаны
    if (dto.disciplines) {
      // Удалить старые
      await this.prisma.competitionDiscipline.deleteMany({
        where: { competitionId: id },
      });
      // Создать новые
      updateData.disciplines = {
        create: dto.disciplines.map((discipline) => ({ discipline })),
      };
    }

    return this.prisma.competition.update({
      where: { id },
      data: updateData,
      include: {
        disciplines: true,
        judges: {
          include: {
            judge: true,
          },
        },
      },
    });
  }

  /**
   * Удалить соревнование
   */
  async remove(id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    // Удалить логотип из S3 если есть
    if (competition.logoKey) {
      await this.deleteLogoFromS3(competition.logoKey);
    }

    // Prisma автоматически удалит связанные записи благодаря onDelete: Cascade
    await this.prisma.competition.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Загрузить логотип соревнования
   */
  async uploadLogo(id: string, file: Express.Multer.File) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      throw new NotFoundException(`Competition with ID ${id} not found`);
    }

    // Удалить старый логотип если есть
    if (competition.logoKey) {
      await this.deleteLogoFromS3(competition.logoKey);
    }

    // Создать уникальное имя файла
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `competitions/${id}/${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Загрузить в S3/MinIO
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    // Сформировать URL
    const logoUrl = this.getS3Url(fileName);

    // Обновить запись в БД
    const updatedCompetition = await this.prisma.competition.update({
      where: { id },
      data: {
        logoUrl,
        logoKey: fileName,
      },
    });

    return updatedCompetition;
  }

  /**
   * Удалить логотип из S3
   */
  private async deleteLogoFromS3(key: string) {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('Failed to delete logo from S3:', error);
      // Не прерываем процесс если не удалось удалить из S3
    }
  }

  /**
   * Получить публичный URL файла в S3
   */
  private getS3Url(key: string): string {
    const endpoint = this.config.get('S3_ENDPOINT');
    if (endpoint) {
      // MinIO URL
      return `${endpoint}/${this.bucketName}/${key}`;
    } else {
      // AWS S3 URL
      const region = this.config.get('S3_REGION') || 'us-east-1';
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
  }
}
