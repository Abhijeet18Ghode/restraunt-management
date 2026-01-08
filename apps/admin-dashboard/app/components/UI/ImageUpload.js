'use client';

import { useState, useRef } from 'react';
import Button from './Button';
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  Eye,
} from 'lucide-react';

export default function ImageUpload({ 
  images = [], 
  onImagesChange, 
  maxImages = 5,
  maxSizePerImage = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const errors = [];

    if (!acceptedTypes.includes(file.type)) {
      errors.push(`${file.name}: Invalid file type. Please use JPEG, PNG, or WebP.`);
    }

    if (file.size > maxSizePerImage) {
      errors.push(`${file.name}: File too large. Maximum size is ${maxSizePerImage / (1024 * 1024)}MB.`);
    }

    return errors;
  };

  const processFiles = async (files) => {
    const fileArray = Array.from(files);
    const newErrors = [];

    // Check total count
    if (images.length + fileArray.length > maxImages) {
      newErrors.push(`Cannot upload more than ${maxImages} images total.`);
      setErrors(newErrors);
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      const fileErrors = validateFile(file);
      newErrors.push(...fileErrors);
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      const newImages = [];

      for (const file of fileArray) {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        
        // In a real app, you would upload to your server/cloud storage here
        // For now, we'll simulate an upload and use the preview URL
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload delay

        newImages.push({
          id: Date.now() + Math.random(), // Temporary ID
          url: previewUrl,
          file: file,
          name: file.name,
          size: file.size,
        });
      }

      onImagesChange([...images, ...newImages]);
    } catch (error) {
      setErrors(['Failed to upload images. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeImage = (imageId) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
    
    // Revoke object URL to prevent memory leaks
    const removedImage = images.find(img => img.id === imageId);
    if (removedImage && removedImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(removedImage.url);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openPreview = (image) => {
    setPreviewImage(image);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="text-gray-400">
            <ImageIcon className="h-12 w-12 mx-auto" />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Upload Images'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop images here, or click to select files
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Maximum {maxImages} images, up to {maxSizePerImage / (1024 * 1024)}MB each
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={uploading || images.length >= maxImages}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Select Images
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt={image.name || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Image Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => openPreview(image)}
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeImage(image.id)}
                  className="text-white hover:bg-red-500 hover:bg-opacity-20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Primary Image Indicator */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closePreview}
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  );
}