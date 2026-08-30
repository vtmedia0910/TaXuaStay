"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { FocalPointPicker } from "@/components/admin/focal-point-picker";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadCmsMediaAction } from "@/features/cms/actions";
import { CMS_MEDIA_ROLE_LABELS } from "@/features/cms/ui";

export function MediaUploadForm() {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <form action={uploadCmsMediaAction} className="mt-5 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên ảnh" htmlFor="upload-title"><Input id="upload-title" name="title" minLength={2} maxLength={160} required /></Field>
        <Field label="Vai trò" htmlFor="upload-role">
          <Select id="upload-role" name="role" defaultValue="general">
            {Object.entries(CMS_MEDIA_ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Alt text" htmlFor="upload-alt" hint="Mô tả ngắn nội dung ảnh cho người không nhìn thấy ảnh.">
        <Input id="upload-alt" name="alt_text" minLength={2} maxLength={300} required />
      </Field>
      <Field label="Chú thích (không bắt buộc)" htmlFor="upload-caption"><Textarea id="upload-caption" name="caption" maxLength={500} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thư mục" htmlFor="folder">
          <Select id="folder" name="folder" defaultValue="general">
            <option value="homepage">Trang chủ</option><option value="stay">Lưu trú</option><option value="about">Giới thiệu</option>
            <option value="banners">Banner</option><option value="og">Open Graph</option><option value="general">Dùng chung</option>
          </Select>
        </Field>
        <Field label="Tệp ảnh" htmlFor="file" hint="JPEG, PNG, WebP hoặc AVIF; tối đa 10 MB. Kích thước được đọc tự động.">
          <Input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            onChange={(event) => {
              if (preview) URL.revokeObjectURL(preview);
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </Field>
      </div>
      {preview ? <Field label="Điểm lấy nét" htmlFor="upload-focal"><FocalPointPicker id="upload-focal" src={preview} alt="Xem trước ảnh đang tải lên" /></Field> : <><input type="hidden" name="focal_x" value="50" /><input type="hidden" name="focal_y" value="50" /></>}
      <div><SubmitButton label="Tải ảnh lên" icon={<ImagePlus size={18} />} /></div>
    </form>
  );
}
