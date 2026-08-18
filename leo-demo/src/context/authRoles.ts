export const Role = {
  Student: "student",
  Teacher: "teacher",
} as const

export type Role = (typeof Role)[keyof typeof Role]
