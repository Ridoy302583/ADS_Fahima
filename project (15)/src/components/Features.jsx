import React from 'react';
import { FaFileUpload, FaCommentDots, FaChartBar, FaBrain, FaChartLine } from 'react-icons/fa';

const features = [
  {
    icon: <FaFileUpload className="text-6xl mb-6 text-primary" />,
    title: 'Easy Data Upload',
    description: 'Simply upload your dataset and let our AI do the magic! 📁✨',
  },
  {
    icon: <FaCommentDots className="text-6xl mb-6 text-primary" />,
    title: 'Natural Language Insights',
    description: 'Ask questions about your data and get human-like responses. 💬🤖',
  },
  {
    icon: <FaChartBar className="text-6xl mb-6 text-primary" />,
    title: 'Visual Data Insights',
    description: 'Generate beautiful charts, graphs, and visualizations instantly. 📊📈',
  },
  {
    icon: <FaBrain className="text-6xl mb-6 text-primary" />,
    title: 'Automated Model Training',
    description: 'Train AI models on your data with just a few clicks. 🧠🔧',
  },
  {
    icon: <FaChartLine className="text-6xl mb-6 text-primary" />,
    title: 'Model Metrics',
    description: 'Get detailed performance metrics for your trained models. 📉🎯',
  },
  {
    icon: <FaBrain className="text-6xl mb-6 text-primary" />,
    title: 'Model Metrics',
    description: 'Get detailed performance metrics for your trained models. 📉🎯',
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-light">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Magical Features ✨</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-1">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-primary bg-opacity-10">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
