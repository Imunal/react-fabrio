import { ProductEditor } from "@react-fabrio/ui";
import "@react-fabrio/ui/styles.css";
import "./styles.css";

const product = {
  id: "everyday-tag",
  name: "Everyday tag",
  width: 60,
  height: 35,
  unit: "mm",
} as const;

const App = () => {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-12">
      <h1 className="mb-6 text-lg font-semibold">react-fabrio playground</h1>
      <ProductEditor product={product} />
    </main>
  );
};

export default App;
