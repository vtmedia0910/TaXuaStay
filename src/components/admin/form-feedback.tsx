const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường và thử lại.",
  unauthorized: "Phiên đăng nhập hoặc quyền truy cập không còn hợp lệ.",
  config: "Supabase dành riêng cho Stay chưa được cấu hình.",
  forbidden: "Tài khoản staff không có quyền truy cập chức năng chỉ dành cho admin.",
  "settings-save": "Không thể cập nhật cấu hình. Hãy kiểm tra RLS và thử lại.",
  "property-save": "Không thể lưu nơi lưu trú và amenities. Giao dịch đã được hoàn tác; hãy kiểm tra slug, trạng thái và dữ liệu.",
  "property-archive": "Không thể lưu trữ nơi lưu trú này.",
  "destination-save": "Không thể lưu điểm đến. Hãy kiểm tra slug, tọa độ, múi giờ và trạng thái xuất bản.",
  "room-save": "Không thể lưu loại phòng và amenities. Giao dịch đã được hoàn tác; hãy kiểm tra sức chứa, quantity và trạng thái.",
  "physical-room-save": "Không thể lưu phòng cụ thể. Hãy kiểm tra mã phòng, nơi lưu trú, loại phòng và trạng thái xuất bản.",
  "amenity-save": "Không thể lưu amenity. Slug có thể đã tồn tại.",
  "media-save": "Không thể lưu media. Hãy kiểm tra quan hệ, HTTPS URL và metadata.",
  "verification-save": "Không thể lưu xác minh. Giao dịch đã được hoàn tác; hãy kiểm tra target, bằng chứng, rubric và thời hạn.",
  "room-profile-note-save": "Không thể lưu điểm mạnh/điểm cần lưu ý. Hãy kiểm tra target, nội dung, thứ tự và quyền truy cập.",
  "rate-plan-save": "Không thể lưu bảng giá. Hãy kiểm tra mã, nơi lưu trú, trạng thái và khoảng ngày.",
  "rate-plan-range": "Không thể lưu khoảng ngày của bảng giá vì sẽ làm một quy tắc đang hoạt động không còn ngày áp dụng. Hãy điều chỉnh khoảng ngày hoặc tắt quy tắc trước.",
  "rate-rule-save": "Không thể lưu quy tắc giá. Hãy kiểm tra phòng thuộc đúng nơi lưu trú, khoảng ngày, nguồn và mức ưu tiên.",
  "rate-rule-range": "Quy tắc đang hoạt động phải có ít nhất một ngày giao với khoảng hiệu lực của bảng giá. Có thể tắt quy tắc để lưu trước cho kế hoạch sau.",
  "inventory-save": "Không thể cập nhật tình trạng phòng. Hãy kiểm tra khoảng ngày, số phòng vật lý, nguồn và giá vận hành tùy chọn.",
  "cms-page-invalid": "Nội dung trang hoặc metadata chưa hợp lệ.",
  "cms-page-save": "Không thể lưu bản nháp trang.",
  "cms-page-archive": "Không thể lưu trữ trang nội dung.",
  "cms-section-invalid": "Mục nội dung chưa hợp lệ. Liên kết chỉ được là đường dẫn nội bộ hoặc HTTPS.",
  "cms-section-save": "Không thể lưu mục nội dung.",
  "cms-item-invalid": "Mục con chưa hợp lệ; chỉ chọn một loại phòng hoặc một Room ID.",
  "cms-item-save": "Không thể lưu mục con.",
  "cms-publish": "Không thể xuất bản nguyên tử toàn trang. Bản công khai cũ không bị thay đổi.",
  "cms-publish-forbidden": "Bạn không có quyền xuất bản. Hãy nhờ tài khoản Admin kiểm tra và xác nhận bản nháp.",
  "cms-archive-forbidden": "Bạn không có quyền lưu trữ trang. Đây là thao tác chỉ dành cho Admin.",
  "cms-reorder": "Không thể thay đổi vị trí. Thứ tự cũ vẫn được giữ nguyên.",
  "cms-media-invalid": "Ảnh website chưa hợp lệ. Alt text là bắt buộc; chỉ dùng HTTPS hoặc ảnh đúng định dạng/kích thước.",
  "cms-media-metadata": "Không thể đọc kích thước ảnh. Tệp có thể hỏng hoặc không đúng định dạng đã chọn.",
  "cms-media-upload": "Không thể tải ảnh lên bucket site-content.",
  "cms-media-save": "Không thể lưu thông tin ảnh website.",
  "cms-media-archive": "Không thể lưu trữ ảnh website.",
  "cms-media-archive-forbidden": "Bạn không có quyền lưu trữ ảnh website. Đây là thao tác chỉ dành cho Admin.",
  "cms-media-referenced": "Ảnh vẫn đang được tham chiếu trong bản nháp hoặc bản công khai. Hãy thay ảnh trong nội dung trước.",
};

export function FormFeedback({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    const savedMessages: Record<string, string> = {
      draft: "✓ Đã lưu bản nháp. Website công khai chưa thay đổi.",
      published: "✓ Đã xuất bản. Website công khai đã được cập nhật.",
      archived: "✓ Đã lưu trữ.",
      reordered: "✓ Đã cập nhật vị trí trong bản nháp. Website công khai chưa thay đổi.",
      upload: "✓ Đã tải ảnh lên và tự động ghi nhận kích thước.",
      external: "✓ Đã thêm ảnh HTTPS vào thư viện.",
      media: "✓ Đã cập nhật thông tin và điểm lấy nét của ảnh.",
    };
    return (
      <p className="mb-5 rounded-2xl bg-pine-soft p-3 text-sm font-bold text-success" role="status">
        {savedMessages[saved] ?? "✓ Đã cập nhật."}
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
