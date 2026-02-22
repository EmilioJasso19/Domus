export default function isTodayField(obj: any, field: string): boolean {
	const today = new Date();
	const dueDate = new Date(obj[field]);
	return (
		dueDate.getFullYear() === today.getFullYear() &&
		dueDate.getMonth() === today.getMonth() &&
		dueDate.getDate() + 1 === today.getDate() // todo: quitar el +1
	);
}
