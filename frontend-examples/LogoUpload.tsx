// apps/web/src/components/Competitions/LogoUpload.tsx

'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LogoUploadProps {
  competitionId: string;
}

export function LogoUpload({ competitionId }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch current competition data
  const { data: competition } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => api.get(`/competitions/${competitionId}`).then((res) => res.data),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return api.post(`/competitions/${competitionId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Разрешены только файлы PNG, JPG, JPEG и SVG');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Размер файла не должен превышать 2 МБ');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    uploadMutation.mutate(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentLogoUrl = preview || competition?.logoUrl;

  return (
    <div className="logo-upload-container">
      <h3>Логотип соревнования</h3>
      <p className="upload-description">
        Загрузите логотип соревнования. Поддерживаемые форматы: PNG, JPG, SVG. Максимальный размер: 2 МБ.
      </p>

      {currentLogoUrl ? (
        <div className="logo-preview-container">
          <div className="logo-preview">
            <img src={currentLogoUrl} alt="Competition Logo" />
          </div>
          <div className="logo-actions">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              disabled={uploadMutation.isPending}
            >
              Изменить логотип
            </button>
            <button onClick={handleRemove} className="btn btn-danger">
              Удалить
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`logo-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path
                d="M32 8V56M8 32H56"
                stroke="var(--ios-blue)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="var(--ios-blue)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
          <div className="dropzone-text">
            <p className="dropzone-title">
              {uploadMutation.isPending ? 'Загрузка...' : 'Перетащите файл или нажмите для выбора'}
            </p>
            <p className="dropzone-subtitle">PNG, JPG, SVG до 2 МБ</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {uploadMutation.isError && (
        <div className="error-message">
          Ошибка при загрузке логотипа. Пожалуйста, попробуйте снова.
        </div>
      )}
    </div>
  );
}

// Additional CSS needed (add to styles.css)
const styles = `
.logo-upload-container {
  padding: 24px;
}

.upload-description {
  color: var(--ios-gray-1);
  font-size: 14px;
  margin-bottom: 24px;
}

.logo-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.logo-preview {
  width: 100%;
  max-width: 400px;
  height: 300px;
  border: 2px solid var(--ios-gray-5);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--ios-gray-6);
  animation: fadeIn 0.3s ease;
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-actions {
  display: flex;
  gap: 12px;
}

.logo-dropzone {
  width: 100%;
  max-width: 500px;
  height: 300px;
  margin: 0 auto;
  border: 2px dashed var(--ios-gray-4);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  background: var(--ios-bg-secondary);
}

.logo-dropzone:hover {
  border-color: var(--ios-blue);
  background: rgba(0, 122, 255, 0.05);
  transform: scale(1.02);
}

.logo-dropzone.dragging {
  border-color: var(--ios-blue);
  background: rgba(0, 122, 255, 0.1);
  transform: scale(1.05);
}

.dropzone-icon {
  animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropzone-text {
  text-align: center;
}

.dropzone-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ios-label-primary);
  margin-bottom: 8px;
}

.dropzone-subtitle {
  font-size: 14px;
  color: var(--ios-gray-1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;
