"use client";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-teal-50 to-white">
        <h1 className="text-5xl font-bold mb-4 text-center">Vet care at your doorstep, when you need it most</h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
          Our expert mobile vet providers offer after-hours and weekend vet care in the comfort of your home.
        </p>
        <button className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-teal-700 transition">Book online now</button>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <h3 className="text-center text-2xl font-bold mb-6">Comprehensive Vet care at your doorstep</h3>
          <p className="text-center max-w-3xl mx-auto text-gray-600 mb-12">
            MobiPet is here to make Mobile vet care convenient and accessible when your regular vet may not be available.
          </p>
          {/* Add your service cards here */}
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <h2 className="text-center text-3xl font-bold mb-2">How it works</h2>
          <p className="text-center mb-12">Connecting you with local vets in a few simple steps:</p>
          {/* Add your step cards here */}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <h2 className="text-center text-3xl font-bold mb-2">Frequently asked questions</h2>
          <p className="text-center mb-10 text-gray-600">Everything you need to know about MobiPet</p>
          {/* Add your FAQ accordion here */}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <h2 className="text-center text-3xl font-bold mb-2">What people say</h2>
          <p className="text-center mb-12 text-gray-600">See testimonials from our happy clients</p>
          {/* Add your testimonials carousel here */}
        </div>
      </section>
    </div>
  );
} 