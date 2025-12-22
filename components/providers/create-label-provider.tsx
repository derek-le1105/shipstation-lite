import { createContext, ReactNode, useContext } from "react";

type CreateLabelFormCtx = {
  formRef: React.RefObject<HTMLFormElement | null>;
};

const CreateLabelFormContext = createContext<CreateLabelFormCtx | null>(null);

type Props = CreateLabelFormCtx & {
  children: ReactNode;
};

export default function CreateLabelProvider({ formRef, children }: Props) {
  return (
    <CreateLabelFormContext.Provider value={{ formRef }}>
      {children}
    </CreateLabelFormContext.Provider>
  );
}

export function useCreateLabelFormContext() {
  const context = useContext(CreateLabelFormContext);
  if (!context) {
    throw new Error(
      "useCreateLabelFormContext must be used within a CreateLabelFormProvider"
    );
  }
  return context;
}
