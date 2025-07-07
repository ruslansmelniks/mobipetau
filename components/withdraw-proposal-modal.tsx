"use client"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WithdrawProposalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  proposalDetails: {
    date: string
    timeRange: string
    exactTime?: string
  }
}

export function WithdrawProposalModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  proposalDetails 
}: WithdrawProposalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Time Proposal</DialogTitle>
          <DialogDescription>
            Are you sure you want to withdraw your time proposal? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {/* Show proposal details */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Proposal to withdraw:</h4>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Date:</span> {proposalDetails.date}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Time:</span> {proposalDetails.timeRange}
            {proposalDetails.exactTime && ` at ${proposalDetails.exactTime}`}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
          >
            Withdraw Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 