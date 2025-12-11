import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Image,
  Heading,
  HStack,
  VStack,
  useToast,
  Spinner
} from "@chakra-ui/react";

interface Props {
  token: string;
  onClose: () => void;
}

export const BrandingSettings: React.FC<Props> = ({ token, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0ea5a4");
  const [secondaryColor, setSecondaryColor] = useState("#f43f5e");
  const [sidebarColor, setSidebarColor] = useState("#111827");
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBranding() {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch("http://localhost:3000/branding", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await resp.json();
      if (!resp.ok || data.status === "error") {
        throw new Error(data.message || "Erro ao buscar branding");
      }

      const b = data.branding || {};
      setLogoUrl(b.logoUrl || "");
      setPrimaryColor(b.primaryColor || "#0ea5a4");
      setSecondaryColor(b.secondaryColor || "#f43f5e");
      setSidebarColor(b.sidebarColor || "#111827");
      if (b.logoUrl) setFilePreview(b.logoUrl);
    } catch (err: any) {
      console.error("Erro ao carregar branding:", err);
      setError(err.message || "Erro ao carregar branding");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);

      const fd = new FormData();
      fd.append("file", file);

      const resp = await fetch("http://localhost:3000/branding/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      const data = await resp.json();
      if (!resp.ok || data.status === "error") {
        throw new Error(data.message || "Erro ao enviar arquivo");
      }

      // data.url contém /uploads/xyz
      setLogoUrl(data.url);
      setFilePreview(data.url);
      toast({ title: "Upload concluído", status: "success", duration: 3000, isClosable: true });
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setError(err.message || "Erro no upload");
      toast({ title: "Erro no upload", status: "error", duration: 4000, isClosable: true });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch("http://localhost:3000/branding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ logoUrl, primaryColor, secondaryColor, sidebarColor })
      });

      const data = await resp.json();
      if (!resp.ok || data.status === "error") {
        throw new Error(data.message || "Erro ao salvar branding");
      }

      toast({ title: "Branding salvo", status: "success", duration: 3000, isClosable: true });
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar branding:", err);
      setError(err.message || "Erro ao salvar branding");
      toast({ title: "Erro ao salvar", status: "error", duration: 4000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box position="fixed" inset={0} bg="blackAlpha.600" display="flex" alignItems="center" justifyContent="center" zIndex={60}>
      <Box width={["96%", 720]} bg="white" borderRadius="md" p={6}>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <Heading size="md">Configurações de Branding</Heading>
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          </HStack>

          {error && <Box color="red.600">{error}</Box>}
          {loading && <Spinner />}

          <Stack spacing={3}>
            <FormControl>
              <FormLabel>Logo URL</FormLabel>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Upload de logo</FormLabel>
              <Input type="file" accept="image/*" onChange={uploadFile} />
            </FormControl>

            {filePreview && (
              <HStack spacing={4} align="center">
                <Image src={filePreview} alt="preview" boxSize="80px" objectFit="contain" bg="gray.50" borderRadius="md" />
                <Box fontSize="sm" color="gray.600">{uploading ? "Enviando..." : "Preview da logo"}</Box>
              </HStack>
            )}

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Cor primária</FormLabel>
                <Input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Cor secundária</FormLabel>
                <Input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Cor da sidebar</FormLabel>
                <Input type="color" value={sidebarColor} onChange={e => setSidebarColor(e.target.value)} />
              </FormControl>
            </HStack>

            <HStack justify="flex-end">
              <Button onClick={onClose}>Cancelar</Button>
              <Button colorScheme="teal" onClick={save} isLoading={loading}>Salvar</Button>
            </HStack>
          </Stack>
        </VStack>
      </Box>
    </Box>
  );
};
