import Image from "next/image";

export default function Logo({ size = "large" }: { size?: "small" | "large" }) {
  const height = size === "large" ? 50 : 32;
  const width = size === "large" ? 50 : 32;
  const textSize = size === "large" ? "text-4xl" : "text-2xl";

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
         {/* Fallback to emoji if image fails, but assume image exists as per user */}
         <div className="relative z-10">
            <Image 
               src="/images/logo.png" 
               alt="Brain Logo" 
               width={width} 
               height={height}
               className="object-contain"
               onError={(e) => {
                  // Fallback visual if needed currently hidden, 
                  // but in a real app might toggle a state to show specific icon
                  e.currentTarget.style.display = 'none';
               }}
            />
         </div>
      </div>
      <h1 className={`${textSize} font-bold text-gray-900 tracking-tight flex items-center`}>
        <span className="text-blue-600">Auto</span>
        <span className="text-gray-800">Course</span>
      </h1>
    </div>
  );
}

