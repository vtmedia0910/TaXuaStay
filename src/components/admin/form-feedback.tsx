const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường và thử lại.",
  unauthorized: "Phiên đăng nhập hoặc quyền truy cập không còn hợp lệ.",
  config: "Supabase dành riêng cho Stay chưa được cấu hình.",
  forbidden: "Tài khoản staff không có quyền truy cập chức năng chỉ dành cho admin.",
  "settings-save": "Không thể cập nhật cấu hình. Hãy kiểm tra RLS và thử lại.",
  "property-save": "Không thể lưu nơi lưu trú và amenities. Giao dịch đã được hoàn tác; hãy kiểm tra slug, trạng thái và dữ liệu.",
  "property-archive": "Không thể lưu trữ nơi lưu trú này.",
  "room-save": "Không thể lưu loại phòng và amenities. Giao dịch đã được hoàn tác; hãy kiểm tra sức chứa, quantity và trạng thái.",
  "amenity-save": "Không thể lưu amenity. Slug có thể đã tồn tại.",
  "media-save": "Không thể lưu media. Hãy kiểm tra quan hệ, HTTPS URL và metadata.",
  "verification-save": "Không thể lưu xác minh. Giao dịch đã được hoàn tác; hãy kiểm tra target, bằng chứng, rubric và thời hạn.",
  "rate-plan-save": "Không thể lưu bảng giá. Hãy kiểm tra mã, nơi lưu trú, trạng thái và khoảng ngày.",
  "rate-plan-range": "Không thể lưu khoảng ngày của bảng giá vì sẽ làm một quy tắc đang hoạt động không còn ngày áp dụng. Hãy điều chỉnh khoảng ngày hoặc tắt quy tắc trước.",
  "rate-rule-save": "Không thể lưu quy tắc giá. Hãy kiểm tra phòng thuộc đúng nơi lưu trú, khoảng ngày, nguồn và mức ưu tiên.",
  "rate-rule-range": "Quy tắc đang hoạt động phải có ít nhất một ngày giao với khoảng hiệu lực của bảng giá. Có thể tắt quy tắc để lưu trước cho kế hoạch sau.",
};

export function FormFeedback({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    return (
      <p className="mb-5 rounded-2xl bg-pine-soft p-3 text-sm font-bold text-success" role="status">
        ✓ Đã cập nhật
      </p>
    );
  }

  if (error) {
    return (
      <p className="mb-5 rounded-2xl bg-red-50 p-3 text-sm font-bold text-danger" role="alert">
        {ERROR_MESSAGES[error] ?? "Không thể lưu. Hãy kiểm tra dữ liệu và quyền truy cập rồi thử lại."}
      </p>
    );
  }

  return null;
}
