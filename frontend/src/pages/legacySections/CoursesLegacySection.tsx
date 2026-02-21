import { CourseCard } from '../sections/cards';

export function CoursesLegacySection() {
  return (
    <section className="py-16 px-6 bg-gradient-to-b from-slate-950/50 to-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Популярні <span className="text-orange-500">курси</span>
          </h2>
          <p className="text-slate-400">Приєднуйся до тисяч студентів</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <CourseCard icon="💻" title="JavaScript Pro" progress={75} students="2.4K" rating="4.9" />
          <CourseCard icon="🎨" title="UI/UX Design" progress={45} students="1.8K" rating="4.8" />
          <CourseCard icon="🤖" title="AI & ML Basics" progress={92} students="3.1K" rating="4.9" />
        </div>
      </div>
    </section>
  );
}
