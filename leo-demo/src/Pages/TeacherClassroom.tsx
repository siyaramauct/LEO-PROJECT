// -----------------------------------------------------------------------------
// Teacher Classrooms
//
// Every classroom the teacher owns, with search, sorting, a create button and
// a delete button on each card (confirmed in a popup first).
//
// Phones and tablets show compact cards, in one column on phones and two on
// tablets. Desktop shows larger cards beside the sidebar.
//
// Route: /TeacherClassroom || Access: teachers
// -----------------------------------------------------------------------------

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ClassroomDesktopCard from "../Components/ClassroomDesktopCard";
import ClassroomMobileCard, { type Classroom } from "../Components/ClassroomMobileCard";
import ConfirmDialog from "../Components/ConfirmDialog";
import { EmptyClassrooms } from "../Components/EmptyClassroomContent";
import NotificationBell from "../Components/NotificationBell";
import SearchSortBar from "../Components/SearchSortBar";
import TeacherBottomNav from "../Components/TeacherBottomNav";
import TeacherSidebar from "../Components/TeacherSidebar";
import UserIdentity from "../Components/UserIdentity";
import { useAuth } from "../context/AuthContext";
import {
  deleteClassroom,
  getTeacherClassroomsWithCounts,
  type ClassroomWithCounts,
} from "../data/classrooms";
import { errorMessage } from "../data/errors";
import { bucketImageUrlOrBroken } from "../utils/images";
import { compareText, matchesSearch, toTime, type SortOption } from "../utils/listControls";

// -- Data ---------------------------------------------------------------------

const formatCreatedDate = (createdAt: string | null) => {
  if (!createdAt) return "recently";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
};

// Turns a database row into what the classroom cards display.
const toClassroom = (classroom: ClassroomWithCounts): Classroom => {
  return {
    id: classroom.classroom_id,
    name: classroom.classroom_name,
    description: classroom.description ?? "No description has been added yet.",
    studentCount: classroom.studentCount,
    lessonCount: classroom.lessonCount,
    createdDate: formatCreatedDate(classroom.created_date),
    createdTime: toTime(classroom.created_date),
    image: bucketImageUrlOrBroken(classroom.cover_image_path),
    imageAlt: `${classroom.classroom_name} classroom cover`,
    imageClassName: "object-cover",
  };
};

// -- Sorting ------------------------------------------------------------------

type ClassroomSort =
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest"
  | "most-students"
  | "most-lessons";

const classroomSortOptions: SortOption<ClassroomSort>[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most-students", label: "Most students" },
  { value: "most-lessons", label: "Most lessons" },
];

// Returns the compare function for a sort choice. Ties fall back to name order.
const compareClassrooms = (sort: ClassroomSort) => (a: Classroom, b: Classroom) => {
  switch (sort) {
    case "name-desc":
      return compareText(b.name, a.name);
    case "newest":
      return (b.createdTime ?? 0) - (a.createdTime ?? 0) || compareText(a.name, b.name);
    case "oldest":
      return (a.createdTime ?? 0) - (b.createdTime ?? 0) || compareText(a.name, b.name);
    case "most-students":
      return b.studentCount - a.studentCount || compareText(a.name, b.name);
    case "most-lessons":
      return b.lessonCount - a.lessonCount || compareText(a.name, b.name);
    default:
      return compareText(a.name, b.name);
  }
};

// -- Page ---------------------------------------------------------------------

export default function TeacherClassrooms() {
  const { session } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [isDeletingClassroom, setIsDeletingClassroom] = useState(false);
  const [classroomQuery, setClassroomQuery] = useState("");
  const [classroomSort, setClassroomSort] = useState<ClassroomSort>("name-asc");

  // Search first, then sort what is left.
  const visibleClassrooms = useMemo(
    () =>
      classrooms
        .filter((classroom) => matchesSearch(classroomQuery, classroom.name, classroom.description))
        .sort(compareClassrooms(classroomSort)),
    [classrooms, classroomQuery, classroomSort],
  );
  const noMatches = (
    <p className="rounded-lg border border-slate-100 bg-white px-4 py-8 text-center text-sm text-slate-500">
      No classrooms match "{classroomQuery.trim()}".
    </p>
  );

  // One query loads the classrooms with their lesson and student counts.
  useEffect(() => {
    if (!session?.user) return;

    const loadClassrooms = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const teacherClassrooms = await getTeacherClassroomsWithCounts(session.user.id);
        setClassrooms(teacherClassrooms.map(toClassroom));
      } catch (loadError) {
        console.error("Failed to load classrooms:", loadError);
        setLoadError(
          errorMessage(loadError, "We could not load your classrooms. Please try again."),
        );
        setClassrooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadClassrooms();
  }, [session?.user]);

  const totalStudents = classrooms.reduce((total, classroom) => total + classroom.studentCount, 0);

  // Runs after the teacher confirms in the dialog.
  async function handleDeleteClassroom() {
    if (!classroomToDelete || !session?.user || isDeletingClassroom) return;
    setIsDeletingClassroom(true);

    try {
      await deleteClassroom(session.user.id, classroomToDelete.id);

      setClassrooms((currentClassrooms) =>
        currentClassrooms.filter((classroom) => classroom.id !== classroomToDelete.id),
      );
      setClassroomToDelete(null);
    } catch (deleteError) {
      console.error("Failed to delete classroom:", deleteError);
      window.alert(
        errorMessage(deleteError, "The classroom could not be deleted. Please try again."),
      );
    } finally {
      setIsDeletingClassroom(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {
        // -- Phone and tablet layout (under 1024px) --
      }
      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col overflow-y-auto bg-white pb-16 lg:hidden">
        <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4 sm:px-6">
          <div>
            <p className="text-sm text-slate-500">Teacher Portal</p>

            <h1 className="mt-0.5 text-xl font-bold tracking-tight">My Classrooms</h1>

            <p className="mt-0.5 text-[11px] text-slate-400">Manage the classrooms you teach.</p>
          </div>

          <NotificationBell />
        </header>

        {
          // Search + sort, once there are classrooms to search
        }
        {classrooms.length > 0 && (
          <section className="mt-4 shrink-0 px-4 sm:px-6">
            <SearchSortBar
              size="sm"
              query={classroomQuery}
              onQueryChange={setClassroomQuery}
              searchPlaceholder="Search classrooms..."
              sort={classroomSort}
              onSortChange={setClassroomSort}
              sortOptions={classroomSortOptions}
            />
          </section>
        )}

        {
          // Create Classroom
        }
        <section className="mt-2 shrink-0 px-4 sm:px-6">
          <Link
            to="/create-classroom"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 py-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800"
          >
            <Plus size={17} />
            Create Classroom
          </Link>
        </section>

        {
          // Classroom List
        }
        <section className="mt-4 min-h-0 flex-1 px-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Your Classrooms</h2>

            <span className="text-xs text-slate-400">
              {visibleClassrooms.length === classrooms.length
                ? `${classrooms.length} classrooms`
                : `${visibleClassrooms.length} of ${classrooms.length} classrooms`}
            </span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading classrooms...</p>
          ) : loadError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700"
            >
              {loadError}
            </p>
          ) : classrooms.length === 0 ? (
            <EmptyClassrooms compact />
          ) : visibleClassrooms.length === 0 ? (
            noMatches
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {visibleClassrooms.map((classroom) => (
                <ClassroomMobileCard
                  key={classroom.id}
                  classroom={classroom}
                  onDelete={setClassroomToDelete}
                />
              ))}
            </div>
          )}
        </section>

        <TeacherBottomNav active="classes" />
      </div>

      {
        // -- Desktop layout (1024px and up) --
      }
      <div className="hidden min-h-dvh lg:flex">
        <TeacherSidebar active="classes" />

        <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-medium text-violet-700">Teacher Portal</p>

              <h1 className="mt-1 text-2xl font-bold">My Classrooms</h1>

              <p className="mt-1 text-sm text-slate-500">
                View and manage the classrooms you teach.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />

              <UserIdentity />
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl p-4">
            {
              // Page top actions
            }
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Your Classrooms</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {classrooms.length} classrooms · {totalStudents} students
                </p>
              </div>

              <Link
                to="/create-classroom"
                className="flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-800"
              >
                <Plus size={18} />
                Create Classroom
              </Link>
            </div>

            {
              // Search + Filters, once there are classrooms to search
            }
            {classrooms.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-4">
                <SearchSortBar
                  className="w-full max-w-xl"
                  query={classroomQuery}
                  onQueryChange={setClassroomQuery}
                  searchPlaceholder="Search classrooms..."
                  sort={classroomSort}
                  onSortChange={setClassroomSort}
                  sortOptions={classroomSortOptions}
                />

                <p className="shrink-0 text-xs text-slate-400">
                  {visibleClassrooms.length === classrooms.length
                    ? "Showing all classrooms"
                    : `Showing ${visibleClassrooms.length} of ${classrooms.length}`}
                </p>
              </div>
            )}

            {
              // Classroom Grid
            }
            <section className="mt-3">
              {isLoading ? (
                <p className="py-12 text-center text-sm text-slate-400">Loading classrooms...</p>
              ) : loadError ? (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700"
                >
                  {loadError}
                </p>
              ) : classrooms.length === 0 ? (
                <EmptyClassrooms />
              ) : visibleClassrooms.length === 0 ? (
                noMatches
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {visibleClassrooms.map((classroom) => (
                    <ClassroomDesktopCard
                      key={classroom.id}
                      classroom={classroom}
                      onDelete={setClassroomToDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(classroomToDelete)}
        isDeleting={isDeletingClassroom}
        onCancel={() => setClassroomToDelete(null)}
        onConfirm={() => void handleDeleteClassroom()}
        title={`Delete ${classroomToDelete?.name ?? "this classroom"}?`}
        description="This will permanently remove this classroom, its lessons, and its student links. This action cannot be undone."
        confirmLabel="Delete classroom"
        deletingLabel="Deleting classroom..."
      />
    </div>
  );
}
