import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchEntryForm() {
  return (
    <form action="/tim-phong" method="get" className="grid gap-4 rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label htmlFor="home-check-in" className="mb-2 block text-sm font-bold text-pine">Nhận phòng</label>
        <Input id="home-check-in" name="check_in" type="date" className="bg-white" />
      </div>
      <div>
        <label htmlFor="home-check-out" className="mb-2 block text-sm font-bold text-pine">Trả phòng</label>
        <Input id="home-check-out" name="check_out" type="date" className="bg-white" />
      </div>
      <div>
        <label htmlFor="home-adults" className="mb-2 block text-sm font-bold text-pine">Người lớn</label>
        <Input id="home-adults" name="adults" type="number" min={1} max={20} defaultValue={2} required className="bg-white" />
      </div>
      <div>
        <label htmlFor="home-children" className="mb-2 block text-sm font-bold text-pine">Trẻ em</label>
        <Input id="home-children" name="children" type="number" min={0} max={20} defaultValue={0} required className="bg-white" />
        <input type="hidden" name="rooms" value="1" />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="accent" className="w-full">TÌM PHÒNG</Button>
      </div>
    </form>
  );
}
