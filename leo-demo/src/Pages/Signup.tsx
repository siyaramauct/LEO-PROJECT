import SignupForm from "../Components/Signupform";



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
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200
                       bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm
                       transition hover:bg-gray-50 active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8055.54-1.8368.859-3.0477.859-2.3441 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.5955.1023-1.1741.282-1.71V4.9582H.9574A8.9961 8.9961 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
              <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

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