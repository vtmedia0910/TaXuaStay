const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường và thử lại.",
  unauthorized: "Phiên đăng nhập hoặc quyền truy cập không còn hợp lệ.",
  config: "Supabase dành riêng cho Stay chưa được cấu hình.",
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
