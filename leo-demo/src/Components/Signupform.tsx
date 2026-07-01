import { useForm, type SubmitHandler } from "react-hook-form"

type Inputs = {
  firstName: string
  lastName: string
  email: string
  role: "student" | "teacher"
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

  const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">

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

      {/* Role */}
      <div>
        <label htmlFor="role" className={label}>Role</label>
        <select
          id="role"
          className={field}
          {...register("role", { required: "Please select a role" })}
        >
          <option value="">Select a role</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {errors.role && <p className="mt-1 text-[11px] text-red-500">{errors.role.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="mt-1 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold tracking-wide text-white transition hover:bg-violet-100 hover:text-violet-700 hover:border hover:border-violet-600"
      >
        Create Account
      </button>

    </form>
  )
}