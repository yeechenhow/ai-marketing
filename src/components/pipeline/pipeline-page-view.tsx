"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { PipelineBoardData } from "@/lib/pipeline/load-pipeline-board";

export function PipelinePageView({
  title,
  description,
  board,
  prospectHrefPrefix = "/dashboard/prospects",
  showAssignee = false,
}: {
  title: string;
  description: string;
  board: PipelineBoardData;
  prospectHrefPrefix?: string;
  showAssignee?: boolean;
}) {
  const [showProspectDetails, setShowProspectDetails] = useState(false);

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            type="button"
            variant={showProspectDetails ? "default" : "outline"}
            size="sm"
            onClick={() => setShowProspectDetails((v) => !v)}
          >
            {showProspectDetails ? "Hide prospect details" : "Show prospect details"}
          </Button>
        }
      />
      <PipelineBoard
        data={board}
        prospectHrefPrefix={prospectHrefPrefix}
        showAssignee={showAssignee}
        showProspectDetails={showProspectDetails}
      />
    </div>
  );
}
