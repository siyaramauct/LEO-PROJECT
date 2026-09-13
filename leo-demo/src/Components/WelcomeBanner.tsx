
 
 
export default function WelcomeBanner({ teacherName, role }: { teacherName: string; role: string }) {
    return (
        <div className="w-full text-color-black from-violet-500 to-violet-700 text-white  rounded-2xl p-4 flex flex-col gap-3">
            <h1 className="text-2xl font-bold text-black">{role} Dashboard</h1>
            <p className="text-m text-gray-500">Welcome back, {teacherName}!</p>
        </div>
    )


}