import { BarChart3, Code, Image, Video } from 'lucide-react';
import { Button } from '@/ui';
import { GlassCard } from '@/ui/GlassCard';

export function CreatePostLegacySection({
  postText,
  onPostText,
}: {
  postText: string;
  onPostText: (value: string) => void;
}) {
  return (
    <section className="py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-6">
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-orange-500 transition-colors"
            rows={4}
            placeholder="Поділіться своїми досягненнями або запитайте щось у спільноти..."
            value={postText}
            onChange={(e) => onPostText(e.target.value)}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {[Image, Video, Code, BarChart3].map((Icon, index) => (
                <Button
                  key={index}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500 transition-all"
                >
                  <Icon className="w-5 h-5" />
                </Button>
              ))}
            </div>

            <Button data-color="orange" onClick={() => alert('Пост опубліковано!')}>
              Опублікувати
            </Button>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
