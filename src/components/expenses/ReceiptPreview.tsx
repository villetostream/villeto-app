interface ReceiptPreviewProps {
  shopName?: string;
  address?: string;
  phone?: string;
  items?: { description: string; price: number }[];
  total?: number;
  cash?: number;
  change?: number;
  bankCard?: string;
  approvalCode?: string;
}

export function ReceiptPreview({
  shopName = "SHOP NAME",
  address = "Address: Lorem Ipsum, 23-10",
  phone = "Telp. 11223344",
  items = [
    { description: "Lorem", price: 1.1 },
    { description: "Ipsum", price: 2.2 },
    { description: "Dolor sit amet", price: 3.3 },
    { description: "Consectetur", price: 4.4 },
    { description: "Adipiscing elit", price: 5.5 },
  ],
  total = 16.5,
  cash = 20.0,
  change = 3.5,
  bankCard = "--- --- --- 234",
  approvalCode = "#123456",
}: ReceiptPreviewProps) {
  return (
    <div className="receipt-paper max-w-[260px] text-center">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold tracking-wider">{shopName}</h3>
        <p className="text-[10px] text-muted-foreground">{address}</p>
        <p className="text-[10px] text-muted-foreground">{phone}</p>
      </div>

      {/* Divider */}
      <div className="text-[8px] text-muted-foreground tracking-widest mb-2">
        ************************
      </div>

      <h4 className="font-bold mb-2 tracking-wide">CASH RECEIPT</h4>

      {/* Items */}
      <div className="text-left mb-3">
        <div className="flex justify-between text-[10px] font-bold border-b border-dashed border-border pb-1 mb-1">
          <span>Description</span>
          <span>Price</span>
        </div>
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-[10px]">
            <span>{item.description}</span>
            <span>{item.price.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="text-[8px] text-muted-foreground tracking-widest mb-2">
        ************************
      </div>

      {/* Totals */}
      <div className="text-left mb-3">
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{total.toFixed(1)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Cash</span>
          <span>{cash.toFixed(1)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Change</span>
          <span>{change.toFixed(1)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="text-[8px] text-muted-foreground tracking-widest mb-2">
        ************************
      </div>

      {/* Bank Details */}
      <div className="text-left text-[10px] mb-4">
        <div className="flex justify-between">
          <span>Bank card</span>
          <span>{bankCard}</span>
        </div>
        <div className="flex justify-between">
          <span>Approval Code</span>
          <span>{approvalCode}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="text-[8px] text-muted-foreground tracking-widest mb-3">
        ************************
      </div>

      {/* Thank You */}
      <p className="font-bold tracking-wider mb-3">THANK YOU!</p>

      {/* Barcode */}
      <div className="flex justify-center">
        <div className="flex gap-[1px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="bg-foreground"
              style={{
                width: i % 3 === 0 ? 2 : 1,
                height: 24,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
