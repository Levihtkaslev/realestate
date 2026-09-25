import { ClipLoader } from "react-spinners";

// spinner while loading (react-spinners)

const Loader = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
      <ClipLoader color="#2563eb" size={36} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default Loader;
