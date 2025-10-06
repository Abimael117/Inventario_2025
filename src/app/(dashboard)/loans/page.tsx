import { loans, products } from "@/lib/data";
import LoansClient from "@/components/loans/loans-client";

export default async function LoansPage() {
  // En una aplicación real, estos datos se obtendrían de una base de datos
  const loansData = loans;
  const productsData = products;

  return (
    <div className="flex flex-1 flex-col">
        <LoansClient loans={loansData} products={productsData} />
    </div>
  );
}
