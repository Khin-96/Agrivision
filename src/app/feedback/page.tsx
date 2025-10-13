'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';

export default function FeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState({
    isCorrect: true,
    actualPlant: '',
    actualDisease: '',
    comments: '',
    rating: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeedback(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value, 10) : value,
    }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFeedback(prev => ({
      ...prev,
      [name]: value === 'true',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // In a real app, we would send this to an API endpoint
    // For now, we'll simulate a successful submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // After a delay, redirect to home
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }, 1500);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">Provide Feedback</h1>
          <p className="mt-2 text-lg text-gray-500">
            Your feedback helps improve our plant identification system.
          </p>

          {isSubmitted ? (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Feedback Submitted</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Thank you for your feedback! Your input helps improve our system.</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-green-700">Redirecting to home page...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-6">
                    {/* Accuracy Feedback */}
                    <div>
                      <label className="text-base font-medium text-gray-900">Was our identification correct?</label>
                      <p className="text-sm text-gray-500">Let us know if our analysis was accurate.</p>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center">
                          <input
                            id="correct-yes"
                            name="isCorrect"
                            type="radio"
                            value="true"
                            checked={feedback.isCorrect}
                            onChange={handleRadioChange}
                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          />
                          <label htmlFor="correct-yes" className="ml-3 block text-sm font-medium text-gray-700">
                            Yes, the identification was correct
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="correct-no"
                            name="isCorrect"
                            type="radio"
                            value="false"
                            checked={!feedback.isCorrect}
                            onChange={handleRadioChange}
                            className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          />
                          <label htmlFor="correct-no" className="ml-3 block text-sm font-medium text-gray-700">
                            No, the identification was incorrect
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Correction Fields (shown only if identification was incorrect) */}
                    {!feedback.isCorrect && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="actualPlant" className="block text-sm font-medium text-gray-700">
                            Actual Plant Type (if known)
                          </label>
                          <input
                            type="text"
                            name="actualPlant"
                            id="actualPlant"
                            value={feedback.actualPlant}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="actualDisease" className="block text-sm font-medium text-gray-700">
                            Actual Disease/Condition (if known)
                          </label>
                          <input
                            type="text"
                            name="actualDisease"
                            id="actualDisease"
                            value={feedback.actualDisease}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* Rating */}
                    <div>
                      <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
                        How would you rate your experience?
                      </label>
                      <select
                        id="rating"
                        name="rating"
                        value={feedback.rating}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Below Average</option>
                        <option value={1}>1 - Poor</option>
                      </select>
                    </div>

                    {/* Comments */}
                    <div>
                      <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                        Additional Comments
                      </label>
                      <textarea
                        id="comments"
                        name="comments"
                        rows={4}
                        value={feedback.comments}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        placeholder="Please share any additional feedback or suggestions..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
