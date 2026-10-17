import type { ApiFailure } from "./api-client";

const messages: Record<string, string> = {
  network_error: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
  timeout: "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút.",
  bad_response: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
  invalid_email_or_password: "Email hoặc mật khẩu không đúng.",
  too_many_sign_in_attempts: "Bạn đăng nhập sai quá nhiều lần. Hãy đợi vài phút rồi thử lại.",
  too_many_sign_up_attempts: "Bạn đăng ký quá nhiều lần. Hãy đợi vài phút rồi thử lại.",
  too_many_password_reset_requests: "Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Hãy đợi vài phút.",
  sign_up_failed: "Không tạo được tài khoản. Email có thể đã được đăng ký.",
  sign_in_failed: "Đăng nhập thất bại. Vui lòng thử lại.",
  email_and_password_are_required: "Vui lòng nhập email và mật khẩu.",
  email_is_required: "Vui lòng nhập email.",
  password_reset_request_failed: "Không gửi được email đặt lại mật khẩu.",
  password_reset_failed: "Không đặt lại được mật khẩu. Liên kết có thể đã hết hạn.",
  session_refresh_failed: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  refresh_token_is_required: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  no_session_to_refresh: "Bạn chưa đăng nhập.",
  unauthorized: "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.",
  rate_limit_exceeded: "Bạn thao tác quá nhanh. Hãy đợi một chút rồi thử lại.",
  redirectto_is_not_an_allowed_application_url: "Địa chỉ chuyển hướng không hợp lệ.",
  account_deletion_failed: "Không xoá được tài khoản. Vui lòng thử lại.",
  not_found: "Không tìm thấy dữ liệu yêu cầu.",
  unexpected_api_error: "Máy chủ gặp lỗi. Vui lòng thử lại sau."
};

const forbiddenReasons: Record<string, string> = {
  "missing-csrf-header": "Yêu cầu bị chặn vì lý do bảo mật. Hãy tải lại trang rồi thử lại.",
  "untrusted-origin": "Trang web này chưa được phép kết nối tới máy chủ."
};

const fieldLabels: Record<string, string> = {
  "body.email": "Email",
  "body.password": "Mật khẩu",
  "body.accessToken": "Mã đặt lại mật khẩu",
  "body.redirectTo": "Địa chỉ chuyển hướng"
};

/** Converts an API failure into a specific Vietnamese message suitable for a toast or inline error. */
export function apiErrorMessage(failure: Pick<ApiFailure, "error" | "errorCode" | "details" | "status"> | undefined, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại."): string {
  if (!failure) return fallback;
  const code = failure.errorCode ?? "";
  if (code === "forbidden") {
    const reason = (failure.details as { reason?: string } | undefined)?.reason;
    return (reason && forbiddenReasons[reason]) || "Bạn không có quyền thực hiện thao tác này.";
  }
  if (code === "validation_failed" && Array.isArray(failure.details)) {
    const first = failure.details[0] as { field?: string; message?: string } | undefined;
    if (first?.field) return `${fieldLabels[first.field] ?? "Dữ liệu"} không hợp lệ${validationHint(first.message)}.`;
    return "Dữ liệu nhập chưa hợp lệ.";
  }
  if (messages[code]) return messages[code];
  if (failure.status && failure.status >= 500) return messages.unexpected_api_error;
  return fallback;
}

function validationHint(message: string | undefined): string {
  const min = message?.match(/at least (\d+) characters/);
  if (min) return `: cần ít nhất ${min[1]} ký tự`;
  if (message?.includes("valid email")) return ": email chưa đúng định dạng";
  return "";
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Mirrors backend rules so users see problems before a round trip (sign-up requires 8+ characters). */
export function passwordProblem(password: string, mode: "sign-in" | "sign-up"): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (mode === "sign-up" && password.length < 8) return "Mật khẩu cần ít nhất 8 ký tự.";
  if (password.length > 200) return "Mật khẩu quá dài.";
  return undefined;
}
