import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
	return (
		<div className="min-h-screen p-6 space-y-6">
			<Skeleton className="h-10 w-1/3" />
			<Skeleton className="h-64 w-full" />
			<Skeleton className="h-32 w-full" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		</div>
	);
}
