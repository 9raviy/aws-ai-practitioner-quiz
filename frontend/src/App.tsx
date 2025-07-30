import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Container } from "@mui/material";

// CI/CD Pipeline Test - Fix environment variables (VITE_ prefix for production)

// Import components
import QuizStart from "./components/QuizStart";
import QuizQuestion from "./components/QuizQuestion";
import QuizResults from "./components/QuizResults";
import ErrorBoundary from "./components/ErrorBoundary";
import { QuizProvider } from "./context/QuizContext";

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#667eea",
    },
    secondary: {
      main: "#764ba2",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontSize: "1rem",
          padding: "12px 24px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <QuizProvider>
          <Router>
            <Container maxWidth="md" className="quiz-container">
              <Routes>
                <Route path="/" element={<QuizStart />} />
                <Route path="/quiz/:sessionId" element={<QuizQuestion />} />
                <Route path="/results/:sessionId" element={<QuizResults />} />
              </Routes>
            </Container>
          </Router>
        </QuizProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
