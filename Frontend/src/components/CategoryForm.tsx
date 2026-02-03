"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // For zod validation
import {
	categorySchema,
	type CategoryFormData,
} from "@/lib/validations/category";
import { useState, useEffect } from "react";

type CategoryFormProps = {
	onSuccess?: () => void;
	defaultValues?: CategoryFormData;
	categoryId?: string;
};

// Component for creating/editing a category
export default function CategoryForm({ onSuccess, defaultValues, categoryId }: CategoryFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<CategoryFormData>({
		resolver: zodResolver(categorySchema),
	});
	useEffect(() => {
		if (defaultValues) {
			reset(defaultValues);
		} else {
			reset({
				name: "",
				description: "",
				color: "#3b82f6",
				icon: "",
			});
		}
	}, [defaultValues, reset]);

	const isEditing = Boolean(categoryId);

	const onSubmit = async (data: CategoryFormData) => {
		try {
			setIsSubmitting(true);
			const url = categoryId ? `/api/categories/${categoryId}` : "/api/categories";
			const method = categoryId ? "PATCH" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to create category");
			}

			reset();
			onSuccess?.();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to create category");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4 p-6 rounded-lg"
		>
			<div>
				<label htmlFor="name" className="block text-sm font-medium mb-1">
					Category Name *
				</label>
				<input
					id="name"
					type="text"
					{...register("name")}
					className="w-full border rounded px-3 py-2"
					placeholder="e.g., Work, Personal, Study"
					// defaultValue={GET()}
				/>
				{errors.name && (
					<p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
				)}
			</div>

			<div>
				<label htmlFor="description" className="block text-sm font-medium mb-1">
					Description
				</label>
				<textarea
					id="description"
					{...register("description")}
					className="w-full border rounded px-3 py-2 resize-none"
					rows={3}
					placeholder="Describe this category..."
				/>
				{errors.description && (
					<p className="text-red-500 text-sm mt-1">
						{errors.description.message}
					</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label htmlFor="color" className="block text-sm font-medium mb-1">
						Color
					</label>
					<input
						id="color"
						type="color"
						{...register("color")}
						className="w-full border rounded h-10"
					/>
					{errors.color && (
						<p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
					)}
				</div>

				<div>
					<label htmlFor="icon" className="block text-sm font-medium mb-1">
						Icon (emoji)
					</label>
					<input
						id="icon"
						type="text"
						{...register("icon")}
						className="w-full border rounded px-3 py-2"
						placeholder="📚"
						maxLength={2}
					/>
					{errors.icon && (
						<p className="text-red-500 text-sm mt-1">{errors.icon.message}</p>
					)}
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
			>
				{isSubmitting ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Category"}
			</button>
		</form>
	);
}
