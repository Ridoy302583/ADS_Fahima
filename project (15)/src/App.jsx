import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AnalysisPage from './components/AnalysisPage';
import Chatpage from './components/ChatbotInterface';

function App() {
  return (
    <Router>
      <div className="bg-gray-50">
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <Hero />
              <Features />
              <Contact />
              <Footer />
            </>
          } />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/chatpage" element={<Chatpage />} />
          {/* <Route path="/chat" render={() => <ChatInterface message={message} />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
