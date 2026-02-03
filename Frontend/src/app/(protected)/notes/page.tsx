"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NotesContent } from "@/components/notes/NotesContent";

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
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return <NotesContent notes={notes} categories={categories} initialCategory={initialCategory} />;
}
