"use client";

// A submit button wrapped in a form that asks for confirmation before firing a
// server action. Used for destructive actions (archive, cancel).
export function ConfirmButton({
  action,
  id,
  message,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
