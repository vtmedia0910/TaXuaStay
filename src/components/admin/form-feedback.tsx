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
  "economics-plan-invalid": "Bảng chi phí chưa hợp lệ. Kiểm tra nhà cung cấp, cơ sở, mã, nguồn và khoảng ngày.",
  "economics-plan-save": "Không thể lưu bảng chi phí. Giao dịch không tạo thay đổi dở dang; kiểm tra quan hệ nhà cung cấp–cơ sở và vòng đời.",
  "economics-plan-range": "Khoảng ngày của bảng chi phí phải còn giao với mọi quy tắc đang hoạt động.",
  "economics-lifecycle-forbidden": "Staff chỉ được quản lý bản nháp và không được thay đổi vòng đời hoặc tham chiếu thỏa thuận.",
  "economics-rule-invalid": "Quy tắc chi phí chưa hợp lệ. Cần giá vốn hoặc tham chiếu thị trường, cùng khoảng ngày và nguồn hợp lệ.",
  "economics-rule-owner": "Bảng chi phí, nhà cung cấp, cơ sở và loại phòng không cùng một phạm vi sở hữu.",
  "economics-rule-range": "Quy tắc hoạt động phải có ngày giao với bảng chi phí.",
  "economics-rule-save": "Không thể lưu quy tắc chi phí. Giao dịch đã hoàn tác; kiểm tra quan hệ nhà cung cấp, quyền và dữ liệu xác minh.",
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
  "supplier-invalid": "Hồ sơ nhà cung cấp chưa hợp lệ. Kiểm tra mã, loại, trạng thái, URL và liên hệ ban đầu.",
  "supplier-save": "Không thể lưu hồ sơ và liên hệ ban đầu. Toàn bộ giao dịch đã được hoàn tác.",
  "supplier-archive": "Không thể lưu trữ nhà cung cấp hoặc đóng các quan hệ đang mở.",
  "supplier-contact-invalid": "Liên hệ chưa hợp lệ. Cần tên và ít nhất điện thoại, email hoặc Zalo.",
  "supplier-contact-save": "Không thể lưu liên hệ. Nhà cung cấp có thể đã lưu trữ hoặc dữ liệu bị trùng.",
  "supplier-property-invalid": "Liên kết cơ sở chưa hợp lệ. Kiểm tra vai trò và khoảng hiệu lực.",
  "supplier-property-save": "Không thể lưu liên kết cơ sở. Kiểm tra quan hệ đang mở, đầu mối chính và trạng thái nhà cung cấp.",
  "partner-forbidden": "Chỉ Admin được thay đổi quan hệ đối tác hoặc tham chiếu hệ thống.",
  "partner-invalid": "Quan hệ đối tác chưa hợp lệ. Kiểm tra trạng thái, tier và các ngày vòng đời.",
  "partner-save": "Không thể lưu quan hệ đối tác. Mỗi nhà cung cấp chỉ có một quan hệ chưa kết thúc.",
  "supplier-ref-invalid": "Tham chiếu hệ thống chưa hợp lệ. Metadata phải là JSON object và không được chứa dữ liệu bí mật.",
  "supplier-ref-save": "Không thể lưu tham chiếu. Danh tính hệ thống là bất biến và phải duy nhất.",
  "motorbike-forbidden": "Chỉ Admin được thay đổi catalog xe máy công khai.",
  "motorbike-invalid": "Lựa chọn xe máy chưa hợp lệ. Kiểm tra nguồn Biker, giá, độ mới, URL xác nhận và trạng thái.",
  "motorbike-save": "Không thể lưu lựa chọn xe máy. Giao dịch đã hoàn tác; kiểm tra Supplier, mapping taxua_biker và điều kiện công khai.",
  "package-forbidden": "Chỉ Admin được thay đổi gói dịch vụ, thành phần, giá và kinh tế.",
  "package-invalid": "Gói chưa hợp lệ. Kiểm tra identity, nguồn thành phần, giá, chi phí, ngày và trạng thái công khai.",
  "package-save": "Không thể lưu gói. Toàn bộ thông tin, thành phần và quy tắc giá đã được hoàn tác.",
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
      supplier: "✓ Đã lưu hồ sơ nhà cung cấp.",
      contact: "✓ Đã lưu liên hệ.",
      property: "✓ Đã lưu liên kết cơ sở.",
      partner: "✓ Đã lưu quan hệ đối tác.",
      reference: "✓ Đã lưu tham chiếu hệ thống.",
      "economics-plan": "✓ Đã lưu bảng chi phí riêng tư.",
      "economics-rule": "✓ Đã lưu quy tắc chi phí riêng tư.",
      motorbike: "✓ Đã lưu lựa chọn xe máy phía Trip.",
      package: "✓ Đã lưu gói dịch vụ, thành phần và quy tắc giá trong một giao dịch.",
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
