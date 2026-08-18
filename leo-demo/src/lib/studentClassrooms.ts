import { supabase } from "../supabase-client"

type ClassroomRow = {
  id: string
  name: string | null
  description: string | null
  teacher_id: string | null
}

type ClassroomStudentRow = {
  classroom_id: string
}

type TeacherProfileRow = {
  id: string
  name: string | null
  surname: string | null
}

export type StudentClassroom = {
  id: string
  name: string
  description: string
  teacherName: string
}

export async function fetchStudentClassrooms(studentId: string): Promise<StudentClassroom[]> {
  const { data: classroomStudentRows, error: classroomStudentError } = await supabase
    .from("classroom_students")
    .select("classroom_id")
    .eq("student_id", studentId)

  if (classroomStudentError) throw classroomStudentError

  const classroomIds = ((classroomStudentRows ?? []) as ClassroomStudentRow[])
    .map((classroomStudent) => classroomStudent.classroom_id)
    .filter(Boolean)

  if (classroomIds.length === 0) return []

  const { data: classroomRows, error: classroomError } = await supabase
    .from("classrooms")
    .select("id, name, description, teacher_id")
    .in("id", classroomIds)
    .order("name", { ascending: true })

  if (classroomError) throw classroomError

  const classrooms = (classroomRows ?? []) as ClassroomRow[]
  const teacherIds = classrooms
    .map((classroom) => classroom.teacher_id)
    .filter((teacherId): teacherId is string => Boolean(teacherId))

  const teacherProfilesById = new Map<string, TeacherProfileRow>()

  if (teacherIds.length > 0) {
    const { data: teacherProfileRows, error: teacherProfileError } = await supabase
      .from("profiles")
      .select("id, name, surname")
      .in("id", teacherIds)

    if (teacherProfileError) throw teacherProfileError

    for (const profile of (teacherProfileRows ?? []) as TeacherProfileRow[]) {
      teacherProfilesById.set(profile.id, profile)
    }
  }

  return classrooms.map((classroom) => {
    const teacherProfile = classroom.teacher_id ? teacherProfilesById.get(classroom.teacher_id) : undefined
    const teacherName = [teacherProfile?.name, teacherProfile?.surname].filter(Boolean).join(" ")

    return {
      id: classroom.id,
      name: classroom.name ?? "Untitled classroom",
      description: classroom.description ?? "No classroom description yet.",
      teacherName: teacherName || "Teacher",
    }
  })
}
