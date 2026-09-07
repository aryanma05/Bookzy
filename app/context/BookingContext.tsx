import React, { createContext, useState, useContext } from 'react';

// Vi definerer hvordan en bestilling ser ut
export type Booking = {
  id: string;
  businessName: string;
  time: string;
  service: string;
  price: string;
};

// Dette er selve "ryggsekken"
type BookingContextType = {
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Denne "Wrapperen" skal ligge rundt hele appen vår
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Funksjon for å legge til en ny bestilling
  const addBooking = (newBooking: Booking) => {
    setBookings((prevBookings) => [...prevBookings, newBooking]);
  };

  return (
    <BookingContext.Provider value={{ bookings, addBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

// En liten hjelper for å hente ut sekken i andre filer
export function useBookings() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings må brukes innenfor en BookingProvider');
  }
  return context;
}