"use client";

import { useState } from "react";
import CategoryForm from "@/components/CategoryForm";
import CategoryList from "@/components/CategoryList";
import { PageTransition } from "@/components/ui/page-transition";

export default function CategoriesPage() {
	const [refreshKey, setRefreshKey] = useState(0);

	const handleSuccess = () => {
		setRefreshKey((prev) => prev + 1);
	};

	return (
		<PageTransition>
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold mb-2">Categories</h1>
				<p className="text-gray-500">
					Organize your notes and customize AI behavior for each category.
				</p>
			</div>

			<div className="grid lg:grid-cols-2 gap-8">
				<div>
					<h2 className="text-xl font-semibold">Create New Category</h2>
					<hr className="my-4 border border-gray-300" />
					<CategoryForm onSuccess={handleSuccess} />
				</div>

				<div>
					<h2 className="text-xl font-semibold">Your Categories</h2>
					<hr className="my-4" />
					<CategoryList key={refreshKey} />
				</div>
			</div>
		</div>
		</PageTransition>
	);
}
