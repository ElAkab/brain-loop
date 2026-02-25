"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NotesContent } from "@/components/notes/NotesContent";
import { PageTransition } from "@/components/ui/page-transition";

interface Note {
	id: string;
	title: string;
	content: string;
	category_id: string;
	created_at: string;
	updated_at: string;
}

interface Category {
	id: string;
	name: string;
	icon: string;
	color?: string;
}

function NotesSkeleton() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="flex justify-between items-center">
				<div className="h-8 bg-muted rounded w-32" />
				<div className="h-9 bg-muted rounded w-28" />
			</div>
			<div className="flex gap-2">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-8 bg-muted rounded w-24" />
				))}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="h-32 bg-muted rounded-xl" />
				))}
			</div>
		</div>
	);
}

// Main page for managing notes
export default function NotesPage() {
	const [notes, setNotes] = useState<Note[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	const searchParams = useSearchParams();
	const initialCategory = searchParams.get("category") ?? undefined;

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [notesRes, categoriesRes] = await Promise.all([
					fetch("/api/notes"), // Fetch notes
					fetch("/api/categories"), // Fetch categories
				]);

				if (notesRes.ok) {
					const notesData = await notesRes.json();
					setNotes(notesData);
				}

				if (categoriesRes.ok) {
					const categoriesData = await categoriesRes.json();
					setCategories(categoriesData);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) {
		return <NotesSkeleton />;
	}

	return <PageTransition><NotesContent notes={notes} categories={categories} initialCategory={initialCategory} /></PageTransition>;
}
