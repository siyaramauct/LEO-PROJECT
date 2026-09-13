import { useRef, useState, type FormEventHandler } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.tsx"

type Inputs = {
  firstName: string
  lastName: string
  email: string
  password: string
}

const field =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"

const label = "block text-sm font-bold text-gray-700 mb-1.5"

export default function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>()

  const { signup } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [signupMessage, setSignupMessage] = useState<string | null>(null)
  const submitLock = useRef(false)

  const handleSignup: SubmitHandler<Inputs> = async (data) => {
    if (submitLock.current) return

    submitLock.current = true
    setAuthError(null)
    setSignupMessage(null)
    setSaving(true)
    console.log("[Signup] Attempting signup for:", data.email)
    try {
      const session = await signup(data.email, data.password, data.firstName, data.lastName)
      console.log("[Signup] ✓ User created successfully:", data.email)
      if (session) {
        navigate("/select-role")
      } else {
        setSignupMessage("Account created. Check your email to confirm your address, then sign in.")
      }
    } catch (error: unknown) {
      console.error("[Signup] ✗ Signup failed:", error)
      setAuthError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setSaving(false)
      submitLock.current = false
    }
  }

  const onSubmit: SubmitHandler<Inputs> = (data) => handleSignup(data)
  const onFormSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    void handleSubmit(onSubmit)(event)
  }

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col gap-4.5">

      {/* First name */}
      <div>
        <label htmlFor="firstName" className={label}>First Name</label>
        <input
          id="firstName"
          placeholder="Jane"
          className={field}
          {...register("firstName", { required: "Required",
            pattern: {
              value: /^[a-zA-Z]*$/,
              message: "Only alphabet letters are allowed"
            },
            minLength: { value: 2, message: "Min 2 characters" },  })}
        />
        {errors.firstName && <p className="mt-1 text-[11px] text-red-500">{errors.firstName.message}</p>}
      </div>

      {/* Last name */}
      <div>
        <label htmlFor="lastName" className={label}>Last Name</label>
        <input
          id="lastName"
          placeholder="Doe"
          className={field}
          {...register("lastName", { required: "Required",
            pattern: {
              value: /^[a-zA-Z]*$/,
              message: "Only alphabet letters are allowed"
            },
            minLength: { value: 2, message: "Min 2 characters" } })}
        />
        {errors.lastName && <p className="mt-1 text-[11px] text-red-500">{errors.lastName.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={label}>Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="jane@example.com"
          className={field}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
        />
        {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className={label}>Password</label>
        <input
          id="password"
          type="password"
          placeholder="Create a strong password"
          className={field}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
              message: "Use uppercase, lowercase, and a number",
            },
          })}
        />
        {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>}
      </div>

      {/* Submit */}
      {authError && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[12px] text-red-600">{authError}</p>
      )}
      {signupMessage && (
        <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-[12px] text-emerald-700">{signupMessage}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-2 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold tracking-wide text-white border border-violet-600 transition hover:bg-white hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Creating account..." : "Create Account"}
      </button>

    </form>
  )
}