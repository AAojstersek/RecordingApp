import RecordingDetail from "@/components/RecordingDetail";

interface PageProps {
  params: {
    id: string;
  };
}

export default function RecordingPage({ params }: PageProps) {
  return <RecordingDetail id={params.id} />;
}

