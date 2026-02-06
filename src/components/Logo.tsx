interface LogoProps {
  fontFamily?: string;
  className?: string;
}

export function Logo({ fontFamily = "'Poppins', sans-serif", className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <h2
        className="text-lg md:text-xl font-bold tracking-tight text-white"
        style={{
          fontFamily: fontFamily,
        }}
      >
        Gym Workout
      </h2>
    </div>
  );
}
