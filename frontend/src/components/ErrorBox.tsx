"use client";
// "use client" because the "Try again" button has a click action

import { FiAlertCircle } from "react-icons/fi";

// red box when loading failed, with an optional "Try again" button

type ErrorBoxProps = {
  message: string;
  onRetry?: () => void;
};

const ErrorBox = ({ message, onRetry }: ErrorBoxProps) => {
  return (
    <div className="mx-auto my-8 flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <FiAlertCircle className="h-8 w-8 text-red-500" />
      <p className="text-sm text-red-700">{message}</p>

      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 border border-red-300 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorBox;
