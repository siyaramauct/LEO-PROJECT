import { useNavigate } from "react-router-dom";

export default function LessonCard({
  title,
  description,
  imageSrc,
  imageAlt,
  number,
}: {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  number: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="w-64 bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="w-full aspect-video overflow-hidden">
        <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-[10px] font-semibold   text-violet-500">VOCABULARY</span>
        <h3 className="text-[13px] font-bold text-gray-800 leading-snug">{title}</h3>
        <p className="text-[11px] text-gray-500 leading-relaxed flex-1">{description}</p>
        <button
          onClick={() => navigate(`/lesson/${number}`)}
          className="mt-2 w-full py-2 rounded-lg bg-violet-600 text-white ring-2 ring-transparent hover:bg-white hover:text-violet-600 hover:ring-violet-600 active:scale-95 transition-all duration-200 text-[12px] font-semibold tracking-wide"
        >
          Practice
        </button>
      </div>
    </div>
  );
}
