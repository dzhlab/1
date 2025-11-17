import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, JudgeLoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role || 'VIEWER',
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Simplified judge login by name
   */
  async judgeLogin(dto: JudgeLoginDto) {
    // Find judge by ID
    const judge = await this.prisma.judge.findUnique({
      where: { id: dto.judgeId },
      include: {
        brigadeAssignments: {
          where: { isActive: true },
          include: {
            brigade: true,
          },
          take: 1,
        },
      },
    });

    if (!judge) {
      throw new UnauthorizedException('Judge not found');
    }

    const assignment = judge.brigadeAssignments[0];

    if (!assignment) {
      throw new UnauthorizedException('Judge has no active brigade assignment');
    }

    // Generate token for judge
    const token = this.jwtService.sign({
      sub: judge.id,
      email: `judge-${judge.id}@temp.local`,
      role: this.mapJudgeRoleToUserRole(assignment.judgeRole),
      judgeRole: assignment.judgeRole,
      panelType: assignment.panelType,
      brigadeId: assignment.brigadeId,
    });

    return {
      judge: {
        id: judge.id,
        fullName: judge.fullName,
        role: assignment.judgeRole,
        panelType: assignment.panelType,
        brigadeId: assignment.brigadeId,
        brigadeName: assignment.brigade.name,
      },
      token,
      redirectTo: this.getJudgePanelRoute(assignment.panelType, assignment.judgeRole),
    };
  }

  /**
   * Get list of judges for simplified login
   */
  async getJudgesForLogin(competitionId?: string) {
    const where = competitionId
      ? {
          brigadeAssignments: {
            some: {
              isActive: true,
              brigade: {
                competitionId,
              },
            },
          },
        }
      : {
          brigadeAssignments: {
            some: {
              isActive: true,
            },
          },
        };

    const judges = await this.prisma.judge.findMany({
      where,
      include: {
        brigadeAssignments: {
          where: { isActive: true },
          include: {
            brigade: true,
          },
          take: 1,
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return judges.map((judge) => {
      const assignment = judge.brigadeAssignments[0];
      return {
        id: judge.id,
        fullName: judge.fullName,
        city: judge.city,
        role: assignment?.judgeRole,
        panelType: assignment?.panelType,
        brigadeId: assignment?.brigadeId,
        brigadeName: assignment?.brigade?.name,
      };
    });
  }

  private async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private generateToken(userId: string, email: string, role: string) {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  private mapJudgeRoleToUserRole(judgeRole: string): string {
    if (judgeRole.startsWith('D')) return 'JUDGE_D';
    if (judgeRole.startsWith('E')) return 'JUDGE_E';
    if (judgeRole.startsWith('A')) return 'JUDGE_A';
    if (judgeRole === 'CHIEF_JUDGE') return 'CHIEF_JUDGE';
    return 'VIEWER';
  }

  private getJudgePanelRoute(panelType: string, judgeRole: string): string {
    switch (panelType) {
      case 'D_PANEL':
        return '/judging/d-panel';
      case 'E_PANEL':
        return '/judging/e-panel';
      case 'A_PANEL':
        return '/judging/a-panel';
      case 'TECHNICAL':
        if (judgeRole === 'LINE_JUDGE') return '/judging/line-judge';
        if (judgeRole === 'TIME_JUDGE') return '/judging/time-judge';
        return '/judging/technical';
      case 'CHIEF':
        return '/judging/chief';
      default:
        return '/judging';
    }
  }
}
