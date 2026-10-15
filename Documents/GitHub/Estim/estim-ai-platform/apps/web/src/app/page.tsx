export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Estim AI Platform</h1>
        <p className="text-lg mb-8">Construction Intelligence System</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Procurement AI</h2>
            <p className="text-gray-600">Fraud detection and price anomalies</p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Cost Forecasting</h2>
            <p className="text-gray-600">Budget overrun prediction</p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Inventory AI</h2>
            <p className="text-gray-600">Demand forecasting</p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Predictive Maintenance</h2>
            <p className="text-gray-600">Equipment failure prediction</p>
          </div>
        </div>
      </div>
    </main>
  )
}
