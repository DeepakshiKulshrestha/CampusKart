import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { resolveImageUrl, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUrl';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const DEFAULT_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const DEFAULT_MAX_FILES = 4;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageUploadDropzone({
  files = [],
  onChange,
  existingImages = [],
  onRemoveExisting,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  disabled = false,
  error: externalError,
  className = '',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [fileItems, setFileItems] = useState([]); // Array of { id, file, previewUrl, name, size }
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Sync internal fileItems with parent files prop
  useEffect(() => {
    setFileItems((prevItems) => {
      // Check if files array matches current items
      const currentFiles = prevItems.map((item) => item.file);
      const isIdentical =
        files.length === currentFiles.length &&
        files.every((f, idx) => f === currentFiles[idx]);

      if (isIdentical) return prevItems;

      // Clean up previous URLs that are no longer in files
      const newItems = files.map((file) => {
        const existing = prevItems.find((item) => item.file === file);
        if (existing) return existing;
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        };
      });

      // Revoke URLs for removed items
      prevItems.forEach((oldItem) => {
        if (!files.includes(oldItem.file)) {
          URL.revokeObjectURL(oldItem.previewUrl);
        }
      });

      return newItems;
    });
  }, [files]);

  // Clean up all object URLs on unmount
  useEffect(() => {
    return () => {
      fileItems.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const totalImagesCount = (existingImages?.length || 0) + fileItems.length;
  const remainingSlots = Math.max(0, maxFiles - totalImagesCount);

  // Validation function
  const validateAndAddFiles = useCallback(
    (newFileList) => {
      setValidationError('');
      if (!newFileList || newFileList.length === 0) return;

      const incoming = Array.from(newFileList);
      const validFilesToAdd = [];
      const errors = [];

      for (const file of incoming) {
        // Check file type
        const ext = file.name ? `.${file.name.split('.').pop().toLowerCase()}` : '';
        const isMimeValid = ALLOWED_TYPES.includes(file.type);
        const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

        if (!isMimeValid && !isExtValid) {
          errors.push(`"${file.name}" has an unsupported format. Please upload JPG, PNG, or WEBP.`);
          continue;
        }

        // Check file size (1 MB)
        if (file.size > maxSizeBytes) {
          errors.push(
            `"${file.name}" exceeds the ${formatBytes(maxSizeBytes)} limit (${formatBytes(file.size)}).`
          );
          continue;
        }

        // Check duplicates
        const isDuplicateInNew = validFilesToAdd.some(
          (f) => f.name === file.name && f.size === file.size
        );
        const isDuplicateInExisting = fileItems.some(
          (item) => item.name === file.name && item.size === file.size
        );

        if (isDuplicateInNew || isDuplicateInExisting) {
          errors.push(`"${file.name}" is already selected.`);
          continue;
        }

        validFilesToAdd.push(file);
      }

      // Check slot limits
      if (validFilesToAdd.length > remainingSlots) {
        errors.push(
          `You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}. Maximum ${maxFiles} total.`
        );
      }

      const filesToCommit = validFilesToAdd.slice(0, remainingSlots);

      if (errors.length > 0) {
        setValidationError(errors[0]);
      }

      if (filesToCommit.length > 0 && onChange) {
        const nextFiles = [...fileItems.map((item) => item.file), ...filesToCommit];
        onChange(nextFiles);
      }

      // Reset file input value so selecting the same file after removal triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [fileItems, maxFiles, maxSizeBytes, onChange, remainingSlots]
  );

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (disabled || remainingSlots <= 0) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  // Remove individual new file
  const handleRemoveFile = (itemId) => {
    const itemToRemove = fileItems.find((item) => item.id === itemId);
    if (itemToRemove?.previewUrl) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }

    const nextItems = fileItems.filter((item) => item.id !== itemId);
    setFileItems(nextItems);
    setValidationError('');

    if (onChange) {
      onChange(nextItems.map((item) => item.file));
    }
  };

  const activeError = externalError || validationError;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled || remainingSlots <= 0}
        className="hidden"
        aria-label="Upload product images"
      />

      {/* Dropzone Container */}
      {remainingSlots > 0 ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer select-none ${isDragging
            ? 'border-[#0638C9] bg-[#0638C9]/10 ring-4 ring-[#0638C9]/20 scale-[1.01]'
            : 'border-[#E8E8E8] bg-[#FBFBFA] hover:border-[#0638C9] hover:bg-[#0638C9]/5'
            } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {/* Electric Blue Icon Badge */}
          <div
            className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform ${isDragging
              ? 'scale-110 bg-[#0638C9] text-white shadow-md shadow-[#0638C9]/30'
              : 'bg-[#0638C9]/10 text-[#0638C9]'
              }`}
          >
            <UploadCloud className="h-6 w-6 stroke-[2.2]" />
          </div>

          <div className="mt-3.5 space-y-1">
            <p className="font-heading font-extrabold text-sm text-[#111111]">
              <span className="text-[#0638C9] hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-[#62666F]">
              JPG, PNG, or WEBP (max {formatBytes(maxSizeBytes)} each, up to {maxFiles} images)
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-white border border-[#E8E8E8] px-3 py-1 text-[11px] font-heading font-bold text-[#62666F] shadow-sm">
              {totalImagesCount} of {maxFiles} images selected
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#E8E8E8] bg-[#FBFBFA] p-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Maximum {maxFiles} photos selected</span>
          </div>
          <p className="mt-1 text-[11px] text-[#62666F]">
            Remove an image below if you want to upload a different one.
          </p>
        </div>
      )}

      {/* Error Message */}
      {activeError && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-700 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{activeError}</span>
        </div>
      )}

      {/* Previews Grid */}
      {(existingImages?.length > 0 || fileItems.length > 0) && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#62666F]">
              Image Previews ({totalImagesCount}/{maxFiles})
            </span>
            <span className="text-[11px] text-[#62666F]">First image is used as primary cover</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Existing Images (Edit mode) */}
            {existingImages?.map((rawUrl, index) => {
              const url = resolveImageUrl(rawUrl);
              if (!url) return null;
              const isCover = index === 0 && fileItems.length === 0;

              return (
                <div
                  key={`existing-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E8E8E8] bg-[#F5F5F2] shadow-sm transition-all hover:shadow-md"
                >
                  <img
                    src={url}
                    alt={`Product preview ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }
                    }}
                  />

                  {/* Cover Badge */}
                  {index === 0 && (
                    <div className="absolute left-2 top-2 rounded-full bg-[#B7FF00] px-2 py-0.5 text-[9px] font-heading font-black uppercase text-[#111111] shadow-sm">
                      Cover Photo
                    </div>
                  )}

                  {/* Existing Badge */}
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] font-heading font-bold text-white">
                    Current
                  </div>

                  {/* Remove Existing Button */}
                  {onRemoveExisting && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveExisting(url, index);
                      }}
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-white shadow-sm transition hover:bg-red-600 focus:outline-none"
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Newly Selected Local Files */}
            {fileItems.map((item, index) => {
              const overallIndex = (existingImages?.length || 0) + index;
              const isCover = overallIndex === 0;

              return (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E8E8E8] bg-[#F5F5F2] shadow-sm transition-all hover:shadow-md"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE) {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }
                    }}
                  />

                  {/* Primary Cover Badge */}
                  {isCover && (
                    <div className="absolute left-2 top-2 rounded-full bg-[#B7FF00] px-2 py-0.5 text-[9px] font-heading font-black uppercase text-[#111111] shadow-sm">
                      Cover Photo
                    </div>
                  )}

                  {/* File Size & Name Caption */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                    <p className="truncate text-[10px] font-medium leading-tight">{item.name}</p>
                    <p className="text-[9px] opacity-75">{formatBytes(item.size)}</p>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(item.id);
                    }}
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-900/80 text-white shadow-sm transition hover:bg-red-600 focus:outline-none"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

