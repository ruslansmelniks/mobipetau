"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Testimonial = {
  id: number
  quote: string
  author: string
  image: string
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
}

export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [isMobile, setIsMobile] = useState(false)

  // Calculate the indices for visible testimonials based on screen size
  const getVisibleCount = () => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) return 3 // Large screens
      if (window.innerWidth >= 640) return 2 // Medium screens
      return 1 // Small screens
    }
    return 3 // Default for SSR
  }

  const [visibleCount, setVisibleCount] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount())
      setIsMobile(window.innerWidth < 640)
    }

    // Set initial values
    handleResize()

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const nextSlide = () => {
    if (isAnimating) return
    setDirection("next")
    setIsAnimating(true)
    setCurrentIndex((prevIndex) => {
      const maxIndex = testimonials.length - visibleCount
      return prevIndex >= maxIndex ? 0 : prevIndex + 1
    })
    setTimeout(() => setIsAnimating(false), 500)
  }

  const prevSlide = () => {
    if (isAnimating) return
    setDirection("prev")
    setIsAnimating(true)
    setCurrentIndex((prevIndex) => {
      const maxIndex = testimonials.length - visibleCount
      return prevIndex === 0 ? maxIndex : prevIndex - 1
    })
    setTimeout(() => setIsAnimating(false), 500)
  }

  // Auto-advance the carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide()
    }, 5000)

    return () => clearInterval(interval)
  }, [currentIndex, visibleCount, isAnimating])

  // For mobile view, render a simpler version
  if (isMobile) {
    return (
      <div className="relative max-w-sm mx-auto">
        <div className="overflow-hidden rounded-lg border">
          <div
            className="transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              width: `${testimonials.length * 100}%`,
              display: "flex",
            }}
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="p-6 bg-white w-full"
                style={{ width: `${100 / testimonials.length}%` }}
              >
                <p className="text-gray-600 mb-4 italic">{testimonial.quote}</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                    <Image
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-6 gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? "next" : "prev")
                setCurrentIndex(index)
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === index ? "bg-teal-500 w-4" : "bg-gray-300",
              )}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={prevSlide}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-primary transition-all"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-primary transition-all"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex gap-6 transition-transform duration-500 ease-in-out",
            isAnimating && "pointer-events-none",
          )}
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
            width: `${(testimonials.length / visibleCount) * 100}%`,
          }}
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="p-6 border rounded-lg bg-white shadow-sm"
              style={{
                width: `calc(${100 / testimonials.length}% - ${((visibleCount - 1) * 24) / testimonials.length}px)`,
              }}
            >
              <p className="text-gray-600 mb-4 italic">{testimonial.quote}</p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                  <Image
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <p className="font-medium">{testimonial.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-primary transition-all"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-primary transition-all"
        aria-label="Next testimonial"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Pagination indicators */}
      <div className="flex justify-center mt-6 gap-2">
        {Array.from({ length: testimonials.length - visibleCount + 1 }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? "next" : "prev")
              setCurrentIndex(index)
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              currentIndex === index ? "bg-teal-500 w-4" : "bg-gray-300",
            )}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
