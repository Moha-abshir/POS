import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <Routes>
          <Route path="/" element={
            <div className="flex h-screen items-center justify-center">
              <h1 className="text-4xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                POS System Initialized
              </h1>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
