import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, FormField, SegmentedControl, Sheet } from "./index";

function SheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mở chi tiết</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Chi tiết" footer={<Button>Lưu</Button>}>
        <FormField label="Tên" />
      </Sheet>
    </>
  );
}

describe("UI primitives", () => {
  it("Button shows a busy, disabled state while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Đăng nhập
      </Button>
    );
    const button = screen.getByRole("button", { name: "Đăng nhập" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("FormField links its label, hint and error for assistive tech", () => {
    render(<FormField label="Mật khẩu" hint="Ít nhất 8 ký tự" error="Mật khẩu quá ngắn" />);
    const input = screen.getByLabelText("Mật khẩu");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("error");
    expect(screen.getByRole("alert")).toHaveTextContent("Mật khẩu quá ngắn");
  });

  it("Sheet traps focus, closes on Escape and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    const opener = screen.getByRole("button", { name: "Mở chi tiết" });
    await user.click(opener);
    expect(screen.getByRole("dialog", { name: "Chi tiết" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng" })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText("Tên")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Lưu" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Đóng" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("SegmentedControl exposes radio semantics", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Khoảng thời gian"
        value="30"
        onChange={onChange}
        options={[
          { value: "30", label: "30 ngày" },
          { value: "90", label: "90 ngày" }
        ]}
      />
    );
    expect(screen.getByRole("radio", { name: "30 ngày" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "90 ngày" }));
    expect(onChange).toHaveBeenCalledWith("90");
  });
});
