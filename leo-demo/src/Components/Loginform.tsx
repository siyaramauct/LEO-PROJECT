import { useForm, type SubmitHandler } from "react-hook-form"

type Inputs = {
  email: string
  password: string
}

const field =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"

const label = "block text-sm font-bold text-gray-700 mb-1.5"

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>()

  const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

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
          placeholder="Your password"
          className={field}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        {errors.password && <p className="mt-1 text-[11px] text-red-500">{errors.password.message}</p>}
        <div className="mt-2 text-right">
          <a href="#" className="text-[11px] text-violet-600 font-semibold hover:underline">
            Forgot password?
          </a>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="mt-1 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold tracking-wide text-white border border-violet-600 transition hover:bg-white hover:text-violet-600"
      >
        Sign In
      </button>

    </form>
  )
}
