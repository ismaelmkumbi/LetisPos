import React from "react";
import { IconCode, IconX } from "@tabler/icons-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import docco from "react-syntax-highlighter/dist/esm/styles/hljs/docco";

SyntaxHighlighter.registerLanguage("typescript", ts);

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";

const CodeDialog = ({ children }: any) => {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  return (
    <div>
      <Tooltip title="View Code" placement="top">
        <IconButton color="inherit" onClick={handleClickOpen}>
          <IconCode size="18" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        sx={{
          ".MuiPaper-root" : {
            minWidth: "700px"
          }
        }}
        onClose={handleClose} 
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            Sample Code
            <IconButton aria-label="close" onClick={handleClose}>
              <IconX />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent className="code-dialog">
          <SyntaxHighlighter language="typescript" style={docco}>
            {children}
          </SyntaxHighlighter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CodeDialog;
