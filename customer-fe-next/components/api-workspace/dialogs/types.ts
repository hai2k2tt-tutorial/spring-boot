export type DialogSubmit = (work: () => Promise<unknown>) => Promise<void>;

export type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  submit: DialogSubmit;
};
