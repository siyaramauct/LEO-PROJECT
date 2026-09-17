import SignupForm from "../Components/Signupform";
import GoogleSignInButton from "../Components/GoogleSignInButton";



export default function SignUp() {
  return (
    <div className="h-screen w-full overflow-hidden flex flex-col lg:flex-row bg-white">

      {/* Mobile-only header image */}
      <div className="lg:hidden w-full h-56 flex-shrink-0 overflow-hidden">
        <img
          src="/language-header-signup.jpg"
          alt="Language learning"
          className="w-full h-full object-cover brightness-[1.04] contrast-[1.06]"
        />
      </div>

      <div className="bg-violet-700 flex-shrink-0
                      hidden
                      lg:flex lg:flex-col lg:w-[46%] lg:h-full lg:items-center
                      lg:justify-between lg:px-12 lg:py-12">

        {/* Branding */}
        <div className="text-center">
          <h1 className="text-white font-extrabold tracking-wide whitespace-nowrap
                         text-base
                         lg:text-[2rem] lg:mb-2">
            Learn English Online
          </h1>
          <p className="text-violet-200 text-[11px] leading-relaxed
                        lg:text-sm lg:mt-1">
            Language learning for the real world.
          </p>
        </div>

        {/* Image — desktop only, vertically centered */}
        <div className="hidden lg:flex flex-1 w-full items-center justify-center">
          <div className="w-[88%] h-[70%] rounded-3xl overflow-hidden shadow-2xl shadow-violet-900/40">
            <img
              src="/stockPhotoHandCards.png"
              alt="Language learning illustration"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <p className="hidden lg:block text-violet-300/40 text-[11px] text-center">
          &copy; 2025 Learn English Online
        </p>
      </div>

      {/* ════ RIGHT / BOTTOM — Form panel ════
           Mobile : flex-1, overflow-y-auto safety net
           Desktop: right column, content centered        */}
      <div className="flex-1 flex flex-col justify-start overflow-y-auto
                      px-6 pt-6 pb-8
                      lg:justify-center lg:px-0 lg:py-0 lg:overflow-hidden">
        <div className="w-full max-w-xs mx-auto lg:max-w-sm">

          {/* Heading */}
          <div className="mb-4 text-center">
            <h2 className="text-gray-900 text-xl font-bold tracking-tight lg:text-2xl">
              Create your account
            </h2>
            <p className="text-gray-400 text-xs mt-1">Start your language journey today.</p>
          </div>

          {/* Google button */}
          <GoogleSignInButton />

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <SignupForm />

          <p className="mt-4 text-center text-xs text-gray-400">
            Already have an account?{" "}
            <a href="/login" className="text-violet-600 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>

    </div>
  );
}
